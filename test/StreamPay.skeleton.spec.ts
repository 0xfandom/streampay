import { expect } from "chai";
import { ethers } from "hardhat";

describe("StreamPay (Issue #1: skeleton)", function () {
  it("deploys and initializes nextStreamId = 1", async function () {
    const StreamPay = await ethers.getContractFactory("StreamPay");
    const sp = await StreamPay.deploy();
    await sp.waitForDeployment();

    expect(await sp.nextStreamId()).to.equal(1n);
  });

  it("getStream reverts for non-existent stream", async function () {
    const StreamPay = await ethers.getContractFactory("StreamPay");
    const sp = await StreamPay.deploy();
    await sp.waitForDeployment();

    await expect(sp.getStream(1)).to.be.reverted;
  });
});
